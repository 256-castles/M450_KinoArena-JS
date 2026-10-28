import { createBrowserRouter } from "react-router";
import { GuestOnly, RequireAdmin, RequireUser } from "./components/Guards.jsx";
import { Layout } from "./components/Layout.jsx";
import { Root } from "./components/Root.jsx";
import { ActivityLogs } from "./pages/admin/ActivityLogs.jsx";
import { AuditoriaIndex, AuditoriumEdit, AuditoriumNew } from "./pages/admin/Auditoria.jsx";
import { MovieEdit, MovieNew, MoviesIndex } from "./pages/admin/Movies.jsx";
import { ShowtimeEdit, ShowtimeNew, ShowtimesAdminIndex } from "./pages/admin/Showtimes.jsx";
import { BookingShow } from "./pages/BookingShow.jsx";
import { BookingsIndex } from "./pages/BookingsIndex.jsx";
import { Checkout } from "./pages/Checkout.jsx";
import { Login } from "./pages/Login.jsx";
import { MovieShow } from "./pages/MovieShow.jsx";
import { NotFound } from "./pages/NotFound.jsx";
import { PasswordResetEdit } from "./pages/PasswordResetEdit.jsx";
import { PasswordResetNew } from "./pages/PasswordResetNew.jsx";
import { ShowtimeShow } from "./pages/ShowtimeShow.jsx";
import { ShowtimesIndex } from "./pages/ShowtimesIndex.jsx";
import { Signup } from "./pages/Signup.jsx";
import { UserEdit } from "./pages/UserEdit.jsx";
import { UserShow } from "./pages/UserShow.jsx";
import { UsersIndex } from "./pages/UsersIndex.jsx";

// Entspricht config/routes.rb des Originals
export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <ShowtimesIndex /> },
          { path: "showtimes", element: <ShowtimesIndex /> },
          { path: "showtimes/:id", element: <ShowtimeShow /> },
          { path: "movies/:id", element: <MovieShow /> },

          // FA-1: Authentifizierung
          {
            element: <GuestOnly />,
            children: [
              { path: "login", element: <Login /> },
              { path: "signup", element: <Signup /> },
              { path: "password_resets/new", element: <PasswordResetNew /> },
              { path: "password_resets/:token/edit", element: <PasswordResetEdit /> }
            ]
          },

          // FA-3/FA-4/FA-7: angemeldete Kunden
          {
            element: <RequireUser />,
            children: [
              { path: "showtimes/:showtimeId/checkout", element: <Checkout /> },
              { path: "bookings", element: <BookingsIndex /> },
              { path: "bookings/:id", element: <BookingShow /> },
              { path: "users", element: <UsersIndex /> },
              { path: "users/:id", element: <UserShow /> },
              { path: "users/:id/edit", element: <UserEdit /> }
            ]
          },

          // FA-5/FA-6/FA-9: Admin
          {
            path: "admin",
            element: <RequireAdmin />,
            children: [
              { index: true, element: <MoviesIndex /> },
              { path: "movies", element: <MoviesIndex /> },
              { path: "movies/new", element: <MovieNew /> },
              { path: "movies/:id/edit", element: <MovieEdit /> },
              { path: "auditoria", element: <AuditoriaIndex /> },
              { path: "auditoria/new", element: <AuditoriumNew /> },
              { path: "auditoria/:id/edit", element: <AuditoriumEdit /> },
              { path: "showtimes", element: <ShowtimesAdminIndex /> },
              { path: "showtimes/new", element: <ShowtimeNew /> },
              { path: "showtimes/:id/edit", element: <ShowtimeEdit /> },
              { path: "activity_logs", element: <ActivityLogs /> }
            ]
          },

          { path: "*", element: <NotFound /> }
        ]
      }
    ]
  }
]);
