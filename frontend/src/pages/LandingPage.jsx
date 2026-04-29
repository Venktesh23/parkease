import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <section className="landing-body">
        <div className="landing-left">
          <h1 className="landing-heading">
            Park Smarter.<br />
            <span>Not Harder.</span>
          </h1>
          <p className="landing-subtext">
            Reserve your campus parking spot in seconds. No more circling lots
            or getting ticketed.
          </p>

          <div className="landing-cta">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/login')}
            >
              Reserve a Spot
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/login', { state: { defaultEmail: 'admin@parkease.com' } })}
            >
              Admin Dashboard
            </button>
          </div>

          <p className="landing-demo-text">
            Demo: <strong>john@example.com</strong> / <strong>password123</strong>
          </p>
        </div>

        <div className="landing-right">
          <div className="landing-mockup">
            <div className="mockup-top-bar">
              <span className="mockup-top-bar-title">Reservation Confirmed</span>
              <span className="mockup-confirmed-badge">Active</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-slot-row">
                <div className="mockup-slot-badge">A1</div>
                <div>
                  <div className="mockup-slot-name">Lot A — Main Campus</div>
                  <div className="mockup-slot-time">Today, 9:00 AM – 11:00 AM</div>
                </div>
              </div>
              <div className="mockup-footer-row">
                <span className="mockup-vehicle">Toyota Camry · ABC-001</span>
                <span className="mockup-amount">Spot Reserved</span>
              </div>
              <div className="mockup-meta">
                <span className="mockup-tag">Standard Slot</span>
                <span className="mockup-tag">First Come</span>
                <span className="mockup-tag">2 hrs</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
