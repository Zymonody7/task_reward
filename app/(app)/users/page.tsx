"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { User, PointRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function UsersPage() {
  return (
    <RequireAdmin>
      <UsersPageContent />
    </RequireAdmin>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<PointRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchUserRecords = useCallback(async (userId: string) => {
    setRecordsLoading(true);
    const res = await apiClient.users.getDetails(userId);
    setRecordsLoading(false);
    if (res.success && res.data) {
      setExpandedRecords(res.data.records ?? []);
    } else {
      setExpandedRecords([]);
    }
  }, []);

  useEffect(() => {
    if (expandedUserId) {
      fetchUserRecords(expandedUserId);
    } else {
      setExpandedRecords([]);
    }
  }, [expandedUserId, fetchUserRecords]);

  const fetchUsers = async () => {
    const res = await apiClient.users.list();
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;

    setCreating(true);
    const res = await apiClient.users.create({
      name: newName,
      username: newUsername,
      password: newPassword,
    });
    if (res.success) {
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      fetchUsers();
    } else {
      alert(res.error?.message ?? "Failed");
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Users
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Username</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Unique, used for login"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Password (min 6 characters)</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  className="mt-2"
                />
              </div>
              <Button
                type="submit"
                isLoading={creating}
                disabled={!newName.trim() || !newUsername.trim() || newPassword.length < 6}
              >
                Create user
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-slate-500 text-sm">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-slate-500 text-sm">No users found.</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="space-y-0">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedUserId((id) => (id === user.id ? null : user.id))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedUserId((id) => (id === user.id ? null : user.id));
                        }
                      }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700">
                          {user.name}
                        </span>
                        {"username" in user && (
                          <span className="text-xs text-slate-400">@{user.username}</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-500">
                        {user.points} pts
                      </div>
                    </div>
                    {expandedUserId === user.id && (
                      <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200">
                        {recordsLoading ? (
                          <div className="py-3 text-sm text-slate-400">Loading records...</div>
                        ) : expandedRecords.length === 0 ? (
                          <div className="py-3 text-sm text-slate-400">No point records.</div>
                        ) : (
                          <ul className="py-2 space-y-1.5">
                            {expandedRecords.map((r) => (
                              <li
                                key={r.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-slate-600">{r.taskTitle}</span>
                                <span className="font-medium text-green-600">
                                  +{r.delta}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {expandedRecords.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            Latest: {new Date(expandedRecords[0].createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

