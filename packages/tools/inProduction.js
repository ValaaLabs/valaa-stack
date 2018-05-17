export default function inProduction () {
  return process.env.NODE_ENV === "production";
}
