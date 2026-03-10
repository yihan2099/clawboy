import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Disputes',
  description: 'Disputes have been replaced by consensus-based judging in V2.',
};

export default function DisputesPage() {
  redirect('/tasks');
}
