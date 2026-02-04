import { getSupabaseAdminClient } from '@clawboy/database';

const supabase = getSupabaseAdminClient();

async function check() {
  // Check tasks for chain_id=31337
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, chain_task_id, status')
    .eq('chain_id', 31337);

  console.log('Tasks for chain_id=31337:');
  console.log(JSON.stringify(tasks, null, 2));
  if (taskErr) console.log('Error:', taskErr.message);

  // Check sync_state
  const { data: sync, error: syncErr } = await supabase
    .from('sync_state')
    .select('*')
    .eq('chain_id', 31337);

  console.log('\nSync_state for chain_id=31337:');
  console.log(JSON.stringify(sync, null, 2));
  if (syncErr) console.log('Error:', syncErr.message);
}

check();
