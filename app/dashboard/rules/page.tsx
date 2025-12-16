'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categorization Rules</h1>
          <p className="text-slate-600 mt-2">
            Create rules to automatically categorize transactions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Active Rules
          </CardTitle>
          <CardDescription>
            Rules are applied in priority order to automatically categorize transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No categorization rules yet.</p>
            <p className="text-sm mt-2">Create rules to automate transaction categorization.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
