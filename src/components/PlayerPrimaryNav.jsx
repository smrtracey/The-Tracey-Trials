import { NavLink } from 'react-router-dom'

function PlayerPrimaryNav() {
  return (
    <nav className="player-primary-nav" aria-label="Player navigation">
      <NavLink
        to="/"
        end
        aria-label="Home"
        title="Home"
        className={({ isActive }) =>
          `player-primary-nav__link${isActive ? ' player-primary-nav__link--active' : ''}`
        }
      >
        <svg
          className="player-primary-nav__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      </NavLink>

      <NavLink
        to="/tasks"
        aria-label="Tasks"
        title="Tasks"
        className={({ isActive }) =>
          `player-primary-nav__link${isActive ? ' player-primary-nav__link--active' : ''}`
        }
      >
        <svg
          className="player-primary-nav__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6h11" />
          <path d="M9 12h11" />
          <path d="M9 18h11" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      </NavLink>
    </nav>
  )
}

export default PlayerPrimaryNav