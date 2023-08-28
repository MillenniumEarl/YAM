import subprocess

# Elenca le branch obsolete
process = subprocess.Popen(["git", "branch", "-vv"], stdout=subprocess.PIPE)
output, _ = process.communicate()

# Decodifica l'output in formato stringa
output = output.decode("utf-8")

# Cerca le branch obsolete e rimuovile
for line in output.splitlines():
    if ": gone]" in line:
        branch_name = line.split()[0]
        subprocess.run(["git", "branch", "-d", branch_name])
