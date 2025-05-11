import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthForm from "./pages/auth/Auth";
import Dashboard from "./pages/dashboard/dashboard";
import IsLogin from "./pages/auth/isLogin";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<IsLogin />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
        <Route path="/signup" element={<AuthForm type="signup" />} />
        <Route path="/login" element={<AuthForm type="login" />} />
      </Routes>
    </Router>
  );
}

export default App;
