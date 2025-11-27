"use client";
import {
  DefaultIconMenu,
  ChartIcon,
  ArrowDownIcon,
  DropDownIcon,
  ArrowUpIcon,
  UserIcon,
} from "@/components/ui/Icons";
import { useUser } from "@/lib/hooks/useUser";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import logo from "../../../public/logo.png";

// Componente memoizado para el menú de usuario
const UserMenu = memo(function UserMenu({
  user,
  loading,
  initials,
  openUserMenu,
  setOpenUserMenu,
  onSignOut,
}) {
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        openUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target)
      ) {
        setOpenUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openUserMenu, setOpenUserMenu]);

  // Mostrar las iniciales si hay usuario, independientemente del estado de carga
  const showInitials = user && initials;

  return (
    <div className="flex items-center ms-3 relative" ref={userMenuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={openUserMenu}
        onClick={() => setOpenUserMenu((v) => !v)}
        className="flex text-sm bg-gray-700 rounded-full focus:ring-4 focus:ring-gray-600"
      >
        <div className="w-10 h-10  items-center self-center flex justify-center align-middle">
          {showInitials ? initials : ""}
        </div>
        <span className="sr-only">Open user menu</span>
      </button>

      {user && (
        <div
          role="menu"
          className={`${
            openUserMenu ? "block" : "hidden"
          } z-50 absolute right-0 top-12 my-4 min-w-56 text-base list-none bg-gray-700 divide-y divide-gray-600 rounded shadow-lg`}
        >
          <div className="px-4 py-3">
            <p className="text-sm text-white">{user?.name}</p>
            <p className="text-sm font-medium text-gray-300 truncate">
              {user?.email}
            </p>
          </div>
          <ul className="py-1">
            <li>
              <a
                href={`/users/${user?.id}`}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
              >
                Dashboard
              </a>
            </li>
            <li>
              <button
                onClick={onSignOut}
                className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
              >
                Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
});

function Sidebar({
  links = [
    { label: "Dashboard", href: "/", icon: ChartIcon },
    {
      label: "Entradas",
      icon: ArrowDownIcon,
      links: [
        { label: "Compras", href: "/purchases" },
        { label: "Entradas", href: "/inflows" },
        { label: "Devoluciones", href: "/returns" },
      ],
    },
    {
      label: "Salidas",
      icon: ArrowUpIcon,
      links: [
        { label: "Ventas", href: "/sales" },
        { label: "Salidas", href: "/outflows" },
      ],
    },
    {
      label: "Inventario",
      icon: BuildingStorefrontIcon,
      links: [
        { label: "Bodegas", href: "/warehouses" },
        { label: "Productos", href: "/products" },
      ],
    },
    {
      label: "Transferencias",
      icon: ArrowsRightLeftIcon,
      href: "/transfers",
    },
    /*
    {
      label: "Transformaciones",
      icon: WrenchIcon,
      href: "/transformations",
    },*/
    {
      label: "Terceros",
      icon: UserIcon,
      links: [
        { label: "Clientes", href: "/customers" },
        { label: "Proveedores", href: "/suppliers" },
        { label: "Vendedores", href: "/sellers" },
      ],
    },
    /*
    {
      label: "Reportes",
      icon: ReportsIcon,
      links: [
        { label: "Cartera", href: "/accounts-receivable" },
        { label: "Resultados", href: "/profit-and-loss" },
      ],
    },
    {
      label: "Configuración",
      icon: SettingsIcon,
      href: "/settings",
    },*/
  ],
  onSignOut,
  children,
}) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const { user, loading } = useUser();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenSidebar(false);
        setOpenUserMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleGroup = (idx) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const initials = useMemo(
    () =>
      user?.name
        ? user.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
        : "",
    [user]
  );

  return (
    <div className="min-h-screen dark bg-zinc-800">
      {/* Top Nav */}
      <nav className="fixed top-0 z-50 w-full  bg-zinc-800">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                aria-controls="logo-sidebar"
                aria-expanded={openSidebar}
                aria-label="Open sidebar"
                onClick={() => setOpenSidebar((v) => !v)}
                className="inline-flex items-center p-2 text-sm text-gray-400 rounded-lg sm:hidden hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                <span className="sr-only">Open sidebar</span>
                <DefaultIconMenu className="w-6 h-6" />
              </button>
              <a href="#" className="flex items-center ms-2 md:me-24 max-w-50">
                <Image src={logo} alt="Logo" objectFit="contain" priority />
              </a>
            </div>

            {/* Menú usuario */}
            <UserMenu
              user={user}
              loading={loading}
              initials={initials}
              openUserMenu={openUserMenu}
              setOpenUserMenu={setOpenUserMenu}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        id="logo-sidebar"
        aria-label="Sidebar"
        onMouseLeave={() => setOpenGroups(new Set())}
        className={`group/sidebar fixed top-0 left-0 z-40 h-screen pt-20 bg-zinc-800 transition-[transform,width] duration-200 ease-in-out w-64 ${
          openSidebar ? "translate-x-0" : "-translate-x-full"
        } sm:translate-x-0 sm:w-16 sm:hover:w-64`}
      >
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {links.map((item, index) => {
              const hasChildren =
                Array.isArray(item.links) && item.links.length > 0;
              const isOpen = openGroups.has(index);
              const groupId = `sidebar-group-${index}`;

              if (!hasChildren) {
                return (
                  <li key={groupId}>
                    <a
                      href={item.href || "#"}
                      title={item.label}
                      className="flex items-center p-2 sm:min-w-0 text-white rounded-lg hover:bg-gray-700 group"
                    >
                      {item.icon && (
                        <span className="text-gray-400 group-hover:text-white">
                          <item.icon className="w-5 h-5" />
                        </span>
                      )}
                      <span className="flex-1 ms-3 whitespace-nowrap sm:ms-0 sm:w-0 sm:min-w-0 sm:flex-none sm:opacity-0 sm:overflow-hidden group-hover/sidebar:sm:ms-3 group-hover/sidebar:sm:w-auto group-hover/sidebar:sm:min-w-0 group-hover/sidebar:sm:flex-1 group-hover/sidebar:sm:opacity-100 group-hover/sidebar:sm:overflow-visible transition-[width,margin,opacity] duration-200">
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span
                          className={`inline-flex items-center justify-center px-2 ms-3 text-sm font-medium rounded-full transition-opacity duration-200 sm:opacity-0 group-hover/sidebar:sm:opacity-100 ${
                            item.badgeVariant === "blue"
                              ? "text-blue-300 bg-blue-900"
                              : "text-gray-300 bg-gray-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </a>
                  </li>
                );
              }

              return (
                <li key={groupId}>
                  <button
                    type="button"
                    aria-controls={`${groupId}-panel`}
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(index)}
                    title={item.label}
                    className="flex items-center w-full p-2 sm:min-w-0 text-base text-white transition duration-75 rounded-lg hover:bg-gray-700 group"
                  >
                    {item.icon && (
                      <span className="text-gray-400 group-hover:text-white">
                        <item.icon className="w-5 h-5" />
                      </span>
                    )}
                    <span className="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap sm:ms-0 sm:w-0 sm:min-w-0 sm:flex-none sm:opacity-0 sm:overflow-hidden group-hover/sidebar:sm:ms-3 group-hover/sidebar:sm:w-auto group-hover/sidebar:sm:min-w-0 group-hover/sidebar:sm:flex-1 group-hover/sidebar:sm:opacity-100 group-hover/sidebar:sm:overflow-visible transition-[width,margin,opacity] duration-200">
                      {item.label}
                    </span>
                    <DropDownIcon
                      className={`w-3 h-3 transition-transform ${
                        isOpen ? "rotate-180" : "rotate-0"
                      } text-gray-400 sm:opacity-0 group-hover/sidebar:sm:opacity-100`}
                    />
                  </button>

                  <ul
                    id={`${groupId}-panel`}
                    className={`ml-2 pl-2 border-l border-gray-700 overflow-hidden transition-all duration-200 sm:pointer-events-none group-hover/sidebar:sm:pointer-events-auto ${
                      isOpen ? "max-h-96 mt-2" : "max-h-0"
                    } space-y-2`}
                  >
                    {item.links.map((link, i) => (
                      <li key={`${groupId}-child-${i}`}>
                        <a
                          href={link.href || "#"}
                          title={link.label}
                          className="flex items-center w-full p-2 text-gray-300 rounded-lg pl-8 sm:pl-2 group-hover/sidebar:sm:pl-8 hover:bg-gray-700 hover:text-white transition-[padding] duration-200"
                        >
                          <span className="sm:w-0 sm:min-w-0 sm:flex-none sm:opacity-0 sm:overflow-hidden group-hover/sidebar:sm:w-auto group-hover/sidebar:sm:min-w-0 group-hover/sidebar:sm:flex-none group-hover/sidebar:sm:opacity-100 group-hover/sidebar:sm:overflow-visible transition-[width,opacity] duration-200">
                            {link.label}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* OVERLAY para mobile */}
      {openSidebar && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpenSidebar(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] sm:hidden"
        />
      )}

      <main className="pt-16 sm:ml-16 bg-zinc-800 min-h-screen h-full">
        <div className="bg-zinc-950 md:rounded-tl-3xl h-full p-6 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

// Memoizar el componente Sidebar con una función de comparación personalizada
export default memo(Sidebar, (prevProps, nextProps) => {
  // Solo re-renderizar si las props esenciales cambian
  return (
    prevProps.brand === nextProps.brand &&
    prevProps.onSignOut === nextProps.onSignOut &&
    prevProps.children === nextProps.children &&
    JSON.stringify(prevProps.links) === JSON.stringify(nextProps.links)
  );
});
