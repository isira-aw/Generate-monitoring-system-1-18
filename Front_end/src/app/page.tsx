import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 text-primary">
          Generator Monitoring System
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Real-time monitoring and management of your generator fleet with
          instant alerts and threshold configuration.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
            <p className="text-gray-600">
              Live telemetry data with WebSocket updates
            </p>
          </div>

          <div className="card">
            <div className="text-4xl mb-4">🚨</div>
            <h3 className="text-xl font-semibold mb-2">Instant Alarms</h3>
            <p className="text-gray-600">
              Get notified when thresholds are exceeded
            </p>
          </div>

          <div className="card">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold mb-2">Easy Configuration</h3>
            <p className="text-gray-600">
              Adjust thresholds through secure settings
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/devices" className="btn btn-primary text-lg px-8 py-3">
            View Devices
          </Link>
          <Link
            href="/register"
            className="btn btn-secondary text-lg px-8 py-3"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
