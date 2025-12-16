'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';

export default function GoalsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Goals</h1>
          <p className="text-slate-600 mt-2">
            Set and track your financial goals
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Goals
          </CardTitle>
          <CardDescription>
            Track spending limits, savings targets, and financial milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No goals created yet.</p>
            <p className="text-sm mt-2">Create your first goal to start tracking progress.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
