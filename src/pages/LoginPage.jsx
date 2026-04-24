import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getDefaultDashboardPath(user) {
  return user?.role === "judge" ? "/judge" : "/";
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, signIn } = useAuth();
  const [formState, setFormState] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackRedirect = getDefaultDashboardPath(user);
  const redirectTo = location.state?.from?.pathname ?? fallbackRedirect;

  if (isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }

    return <Navigate to={redirectTo === "/login" ? fallbackRedirect : redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await signIn(formState);

      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }

      const nextPath = redirectTo === "/login" ? getDefaultDashboardPath(user) : redirectTo;
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell app-shell--centered">
      <section className="screen-card">
        <div className="title-block login-title-block">
          <h1 className="fun-title">The Tracey Trials</h1>
          <p>Welcome to the Competition!</p>
          <p>
            Once you've worked together to figure out the first password, you'll
            be asked to create your own.
          </p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={formState.username}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="Your assigned username - check your box!"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="password"
              required
            />
          </div>

          <div
            className="button-row login-submit-row"
            style={{ justifyContent: "center" }}
          >
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Enter competition"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
