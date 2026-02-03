'use client'

import { useState, useMemo, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { Task, Completion } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useTasks, useUserDetails } from '@/hooks/useSystem'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

type TaskStatus = 'available' | 'completed' | 'completed_today' | 'disabled'

function getTaskStatus(task: Task, completions: Completion[]): TaskStatus {
  if (!task.enabled) return 'disabled'

  const relevantCompletions = completions.filter((c) => c.taskId === task.id)

  if (task.type === 'ONE_TIME' && relevantCompletions.length > 0) {
    return 'completed'
  }

  if (task.type === 'DAILY') {
    const today = new Date().toISOString().split('T')[0]
    const completedToday = relevantCompletions.some((c) => c.date === today)
    if (completedToday) return 'completed_today'
  }

  return 'available'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role ?? 'user'
  const { tasks, isLoading: tasksLoading } = useTasks()
  // Show data for the logged-in user only
  const {
    user: currentUser,
    history,
    completions,
    mutate: mutateUser
  } = useUserDetails(user?.userId ?? null)

  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    msg: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const handleCompleteTask = async (task: Task) => {
    if (!user?.userId || !currentUser) return

    setProcessingTaskId(task.id)
    setFeedback(null)

    const res = await apiClient.tasks.complete(user.userId, task.id)

    if (res.success && res.data) {
      const today = new Date().toISOString().split('T')[0]
      const newCompletion: Completion = {
        userId: currentUser.id,
        taskId: task.id,
        date: today
      }
      await mutateUser(
        {
          user: res.data.user,
          records: [res.data.record, ...history],
          completions: [...completions, newCompletion]
        },
        { revalidate: true }
      )
      setFeedback({
        msg: `Success! Earned ${res.data.record.delta} points.`,
        type: 'success'
      })
    } else {
      const code = res.error?.code
      let msg = res.error?.message ?? 'Failed'

      if (code === 'ALREADY_COMPLETED')
        msg = 'You have already completed this one-time task.'
      if (code === 'ALREADY_COMPLETED_TODAY')
        msg = "You've already done this today. Come back tomorrow!"

      setFeedback({ msg, type: 'error' })
      // Use user from complete response (source of truth) to update local cache and mark task done, avoiding stale read on refetch
      const errRes = res as {
        user?: { id: string; name: string; points: number }
      }
      if (
        (code === 'ALREADY_COMPLETED' || code === 'ALREADY_COMPLETED_TODAY') &&
        errRes.user
      ) {
        const today = new Date().toISOString().split('T')[0]
        const newCompletion: Completion = {
          userId: currentUser.id,
          taskId: task.id,
          date: today
        }
        const hasCompletion = completions.some(
          (c) =>
            c.taskId === task.id &&
            (task.type === 'ONE_TIME' || c.date === today)
        )
        await mutateUser(
          {
            user: errRes.user,
            records: history,
            completions: hasCompletion
              ? completions
              : [...completions, newCompletion]
          },
          { revalidate: false }
        )
      }
    }

    setProcessingTaskId(null)
  }

  const isLoading = tasksLoading

  if (isLoading && !currentUser) {
    return (
      <div className='h-96 w-full flex flex-col items-center justify-center space-y-4'>
        <div className='animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full' />
        <p className='text-slate-500 font-medium'>Loading Dashboard...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Dashboard
          </h1>
          <p className='text-sm text-slate-500 mt-1'>
            Welcome back, {currentUser?.name ?? 'User'}.
          </p>
        </div>
      </div>

      {currentUser ? (
        <div className='grid gap-6 md:grid-cols-12'>
          <div className='md:col-span-8 space-y-6'>
            <Card className='bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-lg shadow-indigo-200'>
              <CardContent className='flex flex-col items-center justify-center py-12 relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-full bg-white opacity-5 pointer-events-none transform -skew-y-12 scale-150' />
                <span className='text-indigo-100 font-medium mb-1 z-10'>
                  Current Balance
                </span>
                <h2 className='text-7xl font-bold tracking-tighter z-10'>
                  {currentUser.points}
                </h2>
                <span className='text-indigo-200 text-sm mt-2 z-10'>
                  Total Reward Points
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>Available Tasks</CardTitle>
                <Badge variant='default'>{tasks.length} Total</Badge>
              </CardHeader>
              <CardContent>
                {feedback && (
                  <div
                    className={cn(
                      'mb-6 p-4 rounded-lg text-sm font-medium flex items-center shadow-sm',
                      feedback.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    )}
                  >
                    {feedback.type === 'success' ? '🎉 ' : '⚠️ '}
                    {feedback.msg}
                  </div>
                )}

                <div className='space-y-4'>
                  {tasks.map((task) => {
                    const status = getTaskStatus(task, completions)
                    const isProcessing = processingTaskId === task.id
                    const isActionable = status === 'available'

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-center justify-between p-5 border rounded-xl transition-all duration-200',
                          !isActionable
                            ? 'bg-slate-50 border-slate-100 opacity-80'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                        )}
                      >
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'font-semibold text-lg',
                                !isActionable
                                  ? 'text-slate-500'
                                  : 'text-slate-900'
                              )}
                            >
                              {task.title}
                            </span>
                            {status === 'completed' && (
                              <Badge variant='success'>Completed</Badge>
                            )}
                            {status === 'completed_today' && (
                              <Badge variant='success'>Done Today</Badge>
                            )}
                            {status === 'disabled' && (
                              <Badge variant='warning'>Disabled</Badge>
                            )}
                          </div>
                          <div className='flex gap-3 items-center mt-1'>
                            <Badge
                              variant='default'
                              className='bg-slate-100 text-slate-600 border border-slate-200'
                            >
                              {task.type === 'DAILY'
                                ? 'Daily Task'
                                : 'One-Time Reward'}
                            </Badge>
                            <span className='text-sm font-bold text-indigo-600'>
                              +{task.reward} pts
                            </span>
                          </div>
                        </div>

                        <Button
                          size='default'
                          variant={isActionable ? 'primary' : 'outline'}
                          disabled={!isActionable || isProcessing}
                          isLoading={isProcessing}
                          onClick={() =>
                            isActionable && handleCompleteTask(task)
                          }
                          className={cn(
                            'min-w-[100px]',
                            !isActionable && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {status === 'available' ? 'Complete' : 'Done'}
                        </Button>
                      </div>
                    )
                  })}
                  {tasks.length === 0 && (
                    <div className='text-center text-slate-500 py-8'>
                      No tasks configured in the system.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='md:col-span-4'>
            <Card className='h-full max-h-[800px] flex flex-col bg-slate-50/50'>
              <CardHeader className='bg-white border-b border-slate-100'>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className='flex-1 overflow-y-auto p-0'>
                {history.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-40 text-slate-400'>
                    <p className='text-sm'>No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className='divide-y divide-slate-100'>
                    {history.map((record) => (
                      <div
                        key={record.id}
                        className='p-4 hover:bg-white transition-colors flex items-start gap-3'
                      >
                        <div className='mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-slate-900 truncate'>
                            {record.taskTitle}
                          </p>
                          <p className='text-xs text-slate-500 mt-0.5'>
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className='text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded'>
                          +{record.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className='p-12 text-center bg-white rounded-xl border border-dashed border-slate-300'>
          <h3 className='text-lg font-medium text-slate-900'>Loading…</h3>
          <p className='text-slate-500'>Fetching your points and task data.</p>
        </div>
      )}
    </div>
  )
}
