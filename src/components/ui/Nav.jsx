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
import {
  BuildingStorefrontIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  MapIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { ArrowsRightLeftIcon, WrenchIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { useTheme } from "next-themes";
import logo from "../../../public/logo.png";
import logoGray from "../../../public/logo-gray.png";
import { Skeleton } from "@heroui/react";
import { ThemeSwitcher } from "./ThemeSwitcher";

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
        className="flex text-sm bg-gray-700 rounded-full focus:ring-4 focus:ring-gray-600 overflow-hidden"
      >
        <div className="w-10 h-10 items-center self-center flex justify-center align-middle">
          {loading ? (
            <Skeleton className="w-full h-full rounded-full" />
          ) : showInitials ? (
            initials
          ) : (
            <UserIcon className="w-6 h-6 text-gray-400" />
          )}
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
              <Link
                href={`/`}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
              >
                Dashboard
              </Link>
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

const DEFAULT_LINKS = [
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
  /*
  {
    label: "Facturas Parciales",
    icon: CurrencyDollarIcon,
    href: "/partial-invoices",
  },*/
  {
    label: "Inventario",
    icon: BuildingStorefrontIcon,
    href: "/products",
  },
  {
    label: "Transferencias",
    icon: ArrowsRightLeftIcon,
    href: "/transfers",
  },
  {
    label: "Transformaciones",
    icon: WrenchIcon,
    href: "/transformations",
  },
  {
    label: "Terceros",
    icon: UserIcon,
    links: [
      { label: "Clientes", href: "/customers" },
      { label: "Proveedores", href: "/suppliers" },
      { label: "Vendedores", href: "/sellers" },
    ],
  },
  {
    label: "Territorios",
    icon: MapIcon,
    href: "/territories",
  },
  {
    label: "Colecciones",
    icon: TagIcon,
    href: "/collections",
  },
];

const SELLER_LINKS = [
  { label: "Dashboard", href: "/", icon: ChartIcon },
  {
    label: "Ventas",
    icon: BanknotesIcon,
    href: "/sales",
  },
  {
    label: "Inventario",
    icon: BuildingStorefrontIcon,
    href: "/products",
  },
];

function Sidebar({ links, onSignOut, children }) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const { user, loading, signOut } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const currentLinks = useMemo(() => {
    if (links) return links;
    if (user?.type === "seller") return SELLER_LINKS;
    return DEFAULT_LINKS;
  }, [links, user]);

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
    [user],
  );

  return (
    <div className="h-[100dvh] bg-[#F8FAFD] dark:bg-[#131314] transition-colors flex flex-col overflow-hidden w-full">
      {/* Top Nav */}
      <nav className="fixed top-0 z-50 w-full bg-[#F8FAFD] dark:bg-[#131314] transition-colors">
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
              <Link
                href="/"
                className="flex items-center ms-2 md:me-24 max-w-50"
              >
                <Image
                  src={resolvedTheme === "light" ? logoGray : logo}
                  alt="Logo"
                  objectFit="contain"
                  priority
                />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Selector de tema */}
              <ThemeSwitcher />

              {/* Menú usuario */}
              <UserMenu
                user={user}
                loading={loading}
                initials={initials}
                openUserMenu={openUserMenu}
                setOpenUserMenu={setOpenUserMenu}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        id="logo-sidebar"
        aria-label="Sidebar"
        onMouseLeave={() => setOpenGroups(new Set())}
        className={`group/sidebar fixed top-0 left-0 z-40 h-screen pt-20 bg-[#F8FAFD] dark:bg-[#131314] transition-[transform,width,background-color] duration-200 ease-in-out w-64 border-none ${
          openSidebar ? "translate-x-0" : "-translate-x-full"
        } sm:translate-x-0 sm:w-16 sm:hover:w-64`}
      >
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {currentLinks.map((item, index) => {
              const hasChildren =
                Array.isArray(item.links) && item.links.length > 0;
              const isOpen = openGroups.has(index);
              const groupId = `sidebar-group-${index}`;

              if (!hasChildren) {
                const isActive =
                  item.href &&
                  (pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href)));
                return (
                  <li key={groupId}>
                    <Link
                      href={item.href || "#"}
                      title={item.label}
                      onClick={() => setOpenSidebar(false)}
                      className={`flex items-center p-2 sm:min-w-0 text-gray-900 dark:text-gray-100 rounded-full group transition-colors ${
                        isActive
                          ? "bg-[#C2E7FF] dark:bg-[#004A77] font-semibold"
                          : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {item.icon && (
                        <span
                          className={`transition-colors ${
                            isActive
                              ? "text-zinc-900 dark:text-white"
                              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                          }`}
                        >
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
                    </Link>
                  </li>
                );
              }

              const isGroupActive = item.links.some(
                (link) =>
                  link.href &&
                  (pathname === link.href ||
                    (link.href !== "/" && pathname.startsWith(link.href))),
              );
              return (
                <li key={groupId}>
                  <button
                    type="button"
                    aria-controls={`${groupId}-panel`}
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(index)}
                    title={item.label}
                    className={`flex items-center w-full p-2 sm:min-w-0 text-base text-gray-900 dark:text-gray-100 transition duration-75 rounded-full group ${
                      isGroupActive
                        ? "bg-[#C2E7FF]/50 dark:bg-[#004A77]/50 font-semibold"
                        : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {item.icon && (
                      <span
                        className={`transition-colors ${
                          isGroupActive
                            ? "text-zinc-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                        }`}
                      >
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
                    className={`ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 sm:pointer-events-none group-hover/sidebar:sm:pointer-events-auto ${
                      isOpen ? "max-h-96 mt-2" : "max-h-0"
                    } space-y-2`}
                  >
                    {item.links.map((link, i) => {
                      const isChildActive =
                        link.href &&
                        (pathname === link.href ||
                          (link.href !== "/" &&
                            pathname.startsWith(link.href)));
                      return (
                        <li key={`${groupId}-child-${i}`}>
                          <Link
                            href={link.href || "#"}
                            title={link.label}
                            onClick={() => setOpenSidebar(false)}
                            className={`flex items-center w-full p-2 rounded-full pl-8 sm:pl-2 group-hover/sidebar:sm:pl-8 transition-[padding,background-color,color] duration-200 ${
                              isChildActive
                                ? "bg-[#C2E7FF] dark:bg-[#004A77] text-zinc-900 dark:text-white font-semibold"
                                : "text-gray-600 dark:text-gray-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <span className="sm:w-0 sm:min-w-0 sm:flex-none sm:opacity-0 sm:overflow-hidden group-hover/sidebar:sm:w-auto group-hover/sidebar:sm:min-w-0 group-hover/sidebar:sm:flex-none group-hover/sidebar:sm:opacity-100 group-hover/sidebar:sm:overflow-visible transition-[width,opacity] duration-200">
                              {link.label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
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

      <main className="pt-16 sm:ml-16 bg-[#F8FAFD] dark:bg-[#131314] flex-1 transition-colors flex flex-col sm:pr-4 sm:pb-4 min-h-0 w-full relative">
        <div className="bg-white dark:bg-[#1E1F22] rounded-t-2xl sm:rounded-3xl flex-1 flex flex-col mt-2 sm:mx-0 sm:mt-2 shadow-sm border border-transparent dark:border-zinc-800/50 transition-colors overflow-hidden relative w-full sm:w-[calc(100vw-5rem)]">
          <div className="flex-1 overflow-auto w-full h-full">
            <div className="p-2 sm:p-6 min-h-full">{children}</div>
          </div>
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
