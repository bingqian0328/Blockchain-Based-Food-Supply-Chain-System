import Link from "next/link";
import NavBar from "../Components/navBar";

export default function Home() {
  const cards = [
    { 
      href: "/RegisterUser", 
      icon: "👤", 
      label: "Register",
      description: "Register your business on the platform" 
    },
    { 
      href: "/createProduct", 
      icon: "➕", 
      label: "Create",
      description: "Create and add new products to the chain" 
    },
    { 
      href: "/viewProducts", 
      icon: "📋", 
      label: "View Shipment",
      description: "Track and manage your shipments" 
    },
    { 
      href: "/decodeQR", 
      icon: "📸", 
      label: "Scan & Track",
      description: "Scan QR codes to track products" 
    },
    { 
      href: "/Inventory", 
      icon: "📦", 
      label: "Inventory",
      description: "Manage your product inventory" 
    },
    { 
      href: "/payAmountDue", 
      icon: "💰", 
      label: "Pay Due",
      description: "Process payments and invoices" 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <NavBar />

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold text-[#161C54] mb-4">
            Welcome to <span className="text-[#57C4E5]">FoodSecure</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Blockchain‑powered transparency for your entire food supply chain.
            Track, trace, and verify food products with confidence.
          </p>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map(({ href, icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                    {icon}
                  </span>
                  <h3 className="ml-4 text-xl font-semibold text-[#161C54] group-hover:text-[#57C4E5] transition-colors">
                    {label}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  {description}
                </p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg 
                    className="w-6 h-6 text-[#57C4E5]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17 8l4 4m0 0l-4 4m4-4H3" 
                    />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#57C4E5] rounded-2xl transition-colors duration-300" />
            </Link>
          ))}
        </section>

        {/* Optional Footer Banner */}
        <section className="mt-16 text-center bg-white p-8 rounded-2xl shadow-md">
          <h2 className="text-2xl font-bold text-[#161C54] mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-6">
            Join the future of food supply chain management
          </p>
          <Link
            href="/RegisterUser"
            className="inline-flex items-center px-6 py-3 bg-[#57C4E5] text-white font-semibold rounded-lg hover:bg-[#4FA8D8] transition-colors"
          >
            Register Now
            <svg 
              className="ml-2 w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14 5l7 7m0 0l-7 7m7-7H3" 
              />
            </svg>
          </Link>
        </section>
      </main>
    </div>
  );
}