import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: '31.97.31.53',
      username: 'root',
      password: '02177123Im.root'
    });
    console.log('Renaming column...');
    let res = await ssh.execCommand('docker exec evolution_postgres psql -U evouser -d travelrock_db -c "ALTER TABLE travelrock_conversations RENAME COLUMN updated_at TO last_updated;"');
    console.log(res.stdout || res.stderr);
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    ssh.dispose();
  }
}

check();
