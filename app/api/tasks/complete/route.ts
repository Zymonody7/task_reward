import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  users,
  tasks,
  pointRecords,
  completions,
  idempotencyKeys
} from '@/lib/db/schema'
import { apiSuccess, apiError } from '@/lib/api/response'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
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
    const idempotencyKey =
      typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : undefined

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

    const key = idempotencyKey || randomUUID()

    const [existingKey] = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
    if (existingKey) {
      return apiError(
        'IDEMPOTENCY_REPLAY',
        'Idempotent request detected: This action was already processed.',
        409
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
    const currentPoints = Number(user.points)
    const newPoints = currentPoints + reward

    // neon-http has no transactions; run in order (claim idempotency key first, then update data to avoid double grant on duplicate requests)
    try {
      await db.insert(idempotencyKeys).values({ key })
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err?.code === '23505') {
        return apiError(
          'IDEMPOTENCY_REPLAY',
          'Idempotent request detected: This action was already processed.',
          409
        )
      }
      throw e
    }
    await db
      .update(users)
      .set({ points: newPoints })
      .where(eq(users.id, user.id))
    const [updatedUser] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, user.id))
    const actualPoints = updatedUser?.points ?? newPoints
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
    await db.insert(completions).values({
      userId: user.id,
      taskId: task.id,
      date: today
    })

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
