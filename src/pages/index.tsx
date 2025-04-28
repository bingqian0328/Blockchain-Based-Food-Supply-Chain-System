import Link from "next/link";
import NavBar from "../Components/navBar";

export default function Home() {
  const cards = [
    { href: "/RegisterUser", icon: "👤", label: "Register" },
    { href: "/createProduct", icon: "➕", label: "Create" },
    { href: "/viewProducts", icon: "📋", label: "View Shipment" },
    { href: "/decodeQR", icon: "📸🔎", label: "Scan & Track" },
    { href: "/Inventory", icon: "📦", label: "Inventory" },
    { href: "/payAmountDue", icon: "💰", label: "Pay Due" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* fixed navbar */}
      <NavBar />

      {/* main hero + grid */}
      <main className="pt-24 pb-12 max-w-5xl mx-auto px-4">
        {/* Optional intro banner */}
        <section className="mb-12">
          <h1 className="text-4xl font-extrabold text-center text-[#161C54]">
            Welcome to FoodSecure
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Blockchain‑powered transparency for your entire food supply chain.
          </p>
        </section>

        {/* action cards grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-8 flex flex-col items-center text-center"
            >
              <div className="text-5xl mb-4 group-hover:text-[#57C4E5] transition">
                {icon}
              </div>
              <span className="mt-auto text-lg font-semibold text-[#161C54] group-hover:text-[#57C4E5] transition">
                {label}
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
