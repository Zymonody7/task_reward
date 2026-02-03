import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  users,
  tasks,
  pointRecords,
  completions
} from '@/lib/db/schema'
import { apiSuccess, apiError } from '@/lib/api/response'
import { eq, and } from 'drizzle-orm'
import { TaskType } from '@/lib/types'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Login required', 401)
    }
    const body = await req.json()
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    const taskId = typeof body?.taskId === 'string' ? body.taskId : ''

    if (!userId || !taskId) {
      return apiError('VALIDATION_ERROR', 'userId and taskId are required', 400)
    }

    if (session.userId !== userId) {
      return apiError(
        'FORBIDDEN',
        'You can only complete tasks for yourself',
        403
      )
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) {
      return apiError('NOT_FOUND', 'User not found', 404)
    }

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
    if (!task) {
      return apiError('NOT_FOUND', 'Task not found', 404)
    }

    if (!task.enabled) {
      return apiError('TASK_DISABLED', 'This task is currently disabled', 400)
    }

    const today = new Date().toISOString().split('T')[0]
    const existingCompletions = await db
      .select()
      .from(completions)
      .where(
        and(eq(completions.userId, user.id), eq(completions.taskId, task.id))
      )

    if (task.type === TaskType.ONE_TIME && existingCompletions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_COMPLETED',
            message: 'One-time task already completed'
          },
          user: { id: String(user.id), name: user.name, points: user.points }
        },
        { status: 400 }
      )
    }

    if (task.type === TaskType.DAILY) {
      const completedToday = existingCompletions.some((c) => c.date === today)
      if (completedToday) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ALREADY_COMPLETED_TODAY',
              message: 'Daily task already completed today'
            },
            user: { id: String(user.id), name: user.name, points: user.points }
          },
          { status: 400 }
        )
      }
    }

    const reward = Number(task.reward)

    // Insert completion first: PK (userId, taskId, date) is the single source of truth.
    // Concurrent requests: only one insert succeeds; the other gets 23505 → already completed.
    try {
      await db.insert(completions).values({
        userId: user.id,
        taskId: task.id,
        date: today
      })
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err?.code === '23505') {
        const [currentUser] = await db
          .select({ points: users.points })
          .from(users)
          .where(eq(users.id, user.id))
        const code =
          task.type === TaskType.ONE_TIME
            ? 'ALREADY_COMPLETED'
            : 'ALREADY_COMPLETED_TODAY'
        const message =
          task.type === TaskType.ONE_TIME
            ? 'One-time task already completed'
            : 'Daily task already completed today'
        return NextResponse.json(
          {
            success: false,
            error: { code, message },
            user: {
              id: String(user.id),
              name: user.name,
              points: currentUser?.points ?? user.points
            }
          },
          { status: 400 }
        )
      }
      throw e
    }

    const [insertedRecord] = await db
      .insert(pointRecords)
      .values({
        userId: user.id,
        taskId: task.id,
        taskTitle: task.title,
        delta: reward,
        note: 'Task Completed'
      })
      .returning({ id: pointRecords.id, createdAt: pointRecords.createdAt })

    await db
      .update(users)
      .set({ points: user.points + reward })
      .where(eq(users.id, user.id))

    const [updatedUser] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, user.id))
    const actualPoints = updatedUser?.points ?? user.points + reward

    const record = insertedRecord
      ? {
          id: String(insertedRecord.id),
          userId: String(user.id),
          taskId: String(task.id),
          taskTitle: task.title,
          delta: reward,
          createdAt: (insertedRecord.createdAt ?? new Date()).toISOString(),
          note: 'Task Completed'
        }
      : {
          id: '',
          userId: String(user.id),
          taskId: String(task.id),
          taskTitle: task.title,
          delta: reward,
          createdAt: new Date().toISOString(),
          note: 'Task Completed'
        }

    return apiSuccess({
      user: { id: String(user.id), name: user.name, points: actualPoints },
      record
    })
  } catch (e) {
    console.error('POST /api/tasks/complete', e)
    return apiError('UNKNOWN_ERROR', 'Failed to complete task', 500)
  }
}
