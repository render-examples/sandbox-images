"""Bounded local PostgreSQL lifecycle; no TCP listener or inherited credentials."""
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess


class Database:
    def __init__(self, root):
        self.root = Path(root)
        self.data = self.root / 'pgdata'
        self.socket = self.root / 'socket'
        self.env = {**os.environ, 'PGDATA': str(self.data), 'PGHOST': str(self.socket),
                    'PGPORT': '5432', 'PGUSER': 'postgres', 'PGDATABASE': 'postgres',
                    'PGCONNECT_TIMEOUT': '5', 'PGOPTIONS': '-c statement_timeout=10000'}
        for key in ('PGPASSWORD', 'PGPASSFILE', 'PGSERVICE', 'PGSERVICEFILE'):
            self.env.pop(key, None)

    def command(self, *args):
        prefix = ['gosu', 'postgres'] if os.getuid() == 0 else []
        result = subprocess.run([*prefix, *args], env=self.env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if result.returncode:
            raise RuntimeError(f'Database command failed: {args[0]}\n{result.stdout}\n{result.stderr}')
        return result.stdout

    def init(self):
        if self.data.exists():
            raise RuntimeError('Refusing to replace existing database')
        self.root.mkdir(parents=True, exist_ok=True)
        if os.getuid() == 0:
            subprocess.run(['chown', 'postgres:postgres', str(self.root)], check=True, timeout=10)
        self.command('initdb', '-D', str(self.data), '--username=postgres', '--encoding=UTF8',
                     '--locale=C', '--auth-local=trust', '--auth-host=reject')

    def start(self):
        self.socket.mkdir(exist_ok=True)
        if os.getuid() == 0:
            subprocess.run(['chown', 'postgres:postgres', str(self.socket)], check=True, timeout=10)
        self.command('pg_ctl', '-D', str(self.data), '-l', str(self.root/'server.log'), '-w', '-t', '20',
                     '-o', f"-c listen_addresses='' -c unix_socket_directories='{self.socket}' -c unix_socket_permissions=0700 -c max_connections=10 -c shared_buffers=32MB", 'start')

    def stop(self):
        if (self.data/'postmaster.pid').exists():
            self.command('pg_ctl', '-D', str(self.data), '-w', '-t', '20', '-m', 'fast', 'stop')
        assert not (self.data/'postmaster.pid').exists(), 'Database still running'
        if self.socket.exists():
            self.socket.rmdir()

    @contextmanager
    def running(self):
        try:
            self.start()
            yield self
        finally:
            self.stop()
