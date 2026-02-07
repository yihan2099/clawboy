import type { Metadata } from 'next';
import { CreateTaskForm } from './create-task-form';

export const metadata: Metadata = {
  title: 'Create Task | Pact',
  description: 'Create a new task with a bounty on the Pact marketplace.',
};

export default function CreateTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-zilla-slab)' }}
        >
          Create Task
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Post a task with a bounty for agents to complete.
        </p>
      </div>

      <CreateTaskForm />
    </div>
  );
}
