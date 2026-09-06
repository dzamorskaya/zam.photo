#!/bin/zsh
cd -- "${0:A:h}"
node src/server.mjs
read '?Нажмите Enter, чтобы закрыть окно.'
