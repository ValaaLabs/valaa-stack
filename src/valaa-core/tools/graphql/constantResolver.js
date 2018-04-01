export default function constantResolver (value) {
  return () => value;
}
