import React from "react";

export default function App() {
  const [status, setStatus] = React.useState("Loading...");

  React.useEffect(() => {
    fetch("/api/health/")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("Error connecting to backend"));
  }, []);

  return (
    <div>
      <h1>AGC ProPack Frontend</h1>
      <p>Backend health: {status}</p>
    </div>
  );
}
