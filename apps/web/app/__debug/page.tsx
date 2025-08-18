export const dynamic = "force-dynamic";
export default function DebugPage() {
  return (
    <div style={{padding:24, fontFamily:"ui-sans-serif, system-ui"}}>
      <h1>__DEBUG LIVE BUILD</h1>
      <p>If you can read this, the service is running the latest repo revision.</p>
      <ul>
        <li>New UI should be installed.</li>
        <li>Time: {new Date().toISOString()}</li>
        <li>Stamp: guided-stepper-installed</li>
      </ul>
    </div>
  );
}
