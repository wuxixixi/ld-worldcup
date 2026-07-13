#!/usr/bin/env python3
import paramiko, sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.34.62.149', 22, 'ubuntu', key_filename=r'C:\Users\Administrator\.ssh\tencent_cloud.pem', timeout=10)

sftp = ssh.open_sftp()
sftp.put(r'D:\workspace\codebuddy\2026-07-03-09-45-52\ld-worldcup\deploy\fetch.py', '/home/ubuntu/ld-worldcup-fetch.py')
sftp.close()

cmd = (
    "set -e\n"
    "sudo mv /home/ubuntu/ld-worldcup-fetch.py /usr/local/bin/ld-worldcup-fetch.py\n"
    "sudo chmod +x /usr/local/bin/ld-worldcup-fetch.py\n"
    'sudo tee /usr/local/bin/ld-worldcup-fetch-wrapper.sh > /dev/null << XEOF\n'
    "#!/bin/bash\n"
    "cd /var/www/ld-worldcup\n"
    "exec /usr/bin/python3 /usr/local/bin/ld-worldcup-fetch.py\n"
    "XEOF\n"
    "sudo chmod +x /usr/local/bin/ld-worldcup-fetch-wrapper.sh\n"
    "echo '--- 手动测试 ---'\n"
    "sudo /usr/local/bin/ld-worldcup-fetch-wrapper.sh 2>&1\n"
    "echo '--- done ---'\n"
)

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
out = stdout.read().decode('utf-8', errors='replace')
print(out[:2000])
err = stderr.read().decode('utf-8', errors='replace')
if err: print('ERR:', err[:500])

ssh.close()
