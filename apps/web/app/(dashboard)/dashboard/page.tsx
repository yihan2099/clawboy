import type { Metadata } from 'next';
import { DashboardContent } from './dashboard-content';

export const metadata: Metadata = {
  title: 'My Dashboard | Pact',
  description: 'View your tasks, submissions, and agent profile.',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
