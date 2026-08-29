load() {
  local entry dir
  if [[ "$1" == "-l" ]]; then
    awk -F'\t' '{printf " -%d  %-15s %s\n", NR, $1, $2}' "$_TAG_FILE" 2>/dev/null
    return
  fi
  if [[ -z "$1" ]]; then
    tail -10 "$_TAG_FILE" 2>/dev/null | tail -r | awk -F'\t' \
      '{printf " -%d  %-15s %s\n", NR, $1, $2}'
    return
  fi
  if [[ "$1" == "last" ]]; then
    entry=$(tail -1 "$_TAG_FILE" 2>/dev/null)
  elif [[ "$1" =~ ^-([0-9]+)$ ]]; then
    entry=$(tail -"${match[1]}" "$_TAG_FILE" 2>/dev/null | head -1)
  else
    entry=$(grep "^$1	" "$_TAG_FILE" 2>/dev/null | tail -1)
  fi
  [[ -n "$entry" ]] || { echo "tag '$1' not found" >&2; return 1 }
  dir="${entry#*	}"
  cd "$dir" || echo "directory gone: $dir" >&2
}