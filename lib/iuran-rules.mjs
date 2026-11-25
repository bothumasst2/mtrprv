export function isPastIuranDeadline(dayOfMonth) {
  return dayOfMonth >= 5
}

export function shouldBlockIuranStatus({ dayOfMonth, role, status }) {
  return isPastIuranDeadline(dayOfMonth) && role === "user" && status !== "paid"
}
