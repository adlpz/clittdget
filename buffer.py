#!/usr/bin/env python

# Only for Python 3.x


import sys
lines = int(sys.argv[1])
buff = ["" for i in range(lines)]

sys.stdout.write("\n"*lines)
sys.stdout.flush()

def MoveUp(N):
    sys.stdout.write("\033[" + str(N) + "A")

def Clear(N):
    MoveUp(N-1)
    sys.stdout.write("\n"*lines)
    MoveUp(N)
    sys.stdout.flush()

for line in sys.stdin:
    Clear(lines);
    buff.insert(0, line.rstrip())
    buff = buff[:lines]
    sys.stdout.write("\n".join(buff))
    sys.stdout.flush()
