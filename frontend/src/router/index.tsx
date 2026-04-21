import { createBrowserRouter, Navigate } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Pacientes from "@/pages/Pacientes/Pacientes";
import NovaAnalise from "@/pages/Analise/NovaAnalise";
import ResultadoAnalise from "@/pages/Analise/ResultadoAnalise";
import Historico from "@/pages/Historico/Historico";
import Configuracoes from "@/pages/Configuracoes/Configuracoes";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "pacientes", element: <Pacientes /> },
      { path: "analise/nova", element: <NovaAnalise /> },
      { path: "analise/:id", element: <ResultadoAnalise /> },
      { path: "historico", element: <Historico /> },
      { path: "configuracoes", element: <Configuracoes /> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
