// pages/registerUser.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useLoadScript, Autocomplete } from "@react-google-maps/api"
import { getContract } from "../contracts/contractConfig"
import { uploadToPinata } from "../utils/pinata"
import NavBar from "../components/NavBar"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const libraries = ["places"] as const

type FormValues = {
  role:
    | "Supplier"
    | "Manufacturer"
    | "LogisticPartner"
    | "DistributionCenter"
    | "RetailStore"
  companyName: string
  email: string
  physicalAddress: string
  phoneNumber: string
}

export default function RegisterUser() {
  const [loading, setLoading] = useState(false)
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null)
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null)

  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  const form = useForm<FormValues>({
    defaultValues: {
      role: "" as any,
      companyName: "",
      email: "",
      physicalAddress: "",
      phoneNumber: "",
    },
    mode: "onTouched",
  })

  const onSubmit = async (data: FormValues) => {
    if (!window.ethereum) {
      alert("Please install MetaMask")
      return
    }
    setLoading(true)
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const account = accounts[0]
      const contract = getContract()
      if (!contract) throw new Error("Contract not found")

      // upload license if any
      let cid = ""
      if (businessLicenseFile) {
        cid = await uploadToPinata(businessLicenseFile)
      }

      // map role to enum
      const roleMap = {
        Supplier: 0,
        Manufacturer: 1,
        LogisticPartner: 2,
        DistributionCenter: 3,
        RetailStore: 4,
      } as const

      const tx = await contract.registerRole(
        roleMap[data.role],
        data.email,
        data.physicalAddress,
        data.companyName,
        cid,
        data.phoneNumber
      )
      await tx.wait()
      alert("Registered as " + data.role)
      form.reset()
      setBusinessLicenseFile(null)
    } catch (err) {
      console.error(err)
      alert("Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error loading maps</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading maps...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-2">
            Register Your Business
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join our blockchain-powered food supply chain network
          </p>
        </section>

        {/* Registration Form */}
        <div className="max-w-2xl mx-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="bg-white rounded-2xl shadow-md p-8 space-y-6 border-2 border-transparent hover:border-[#2D4EA2] transition-colors duration-300"
            >
              {/* Form fields - updating styles */}
              <FormField
                control={form.control}
                name="role"
                rules={{ required: "Please select a role" }}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[#161C54] font-medium">Role</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg hover:border-[#2D4EA2] transition-colors">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Supplier">Supplier</SelectItem>
                          <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                          <SelectItem value="LogisticPartner">
                            Logistic Partner
                          </SelectItem>
                          <SelectItem value="DistributionCenter">
                            Distribution Center
                          </SelectItem>
                          <SelectItem value="RetailStore">
                            Retail Store
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />

              {/* Company Name */}
              <FormField
                control={form.control}
                name="companyName"
                rules={{ required: "Company is required" }}
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-4">
                    <FormLabel className="text-[#161C54] font-medium mb-1">
                      Company Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company name"
                        {...field}
                        className="border-gray-300 focus:ring-[#4F55F7] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/,
                    message: "Invalid email",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-4">
                    <FormLabel className="text-[#161C54] font-medium mb-1">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                        className="border-gray-300 focus:ring-[#4F55F7] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Physical Address w/ Autocomplete */}
              <FormField
                control={form.control}
                name="physicalAddress"
                rules={{ required: "Address is required" }}
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-4">
                    <FormLabel className="text-[#161C54] font-medium mb-1">
                      Physical Address
                    </FormLabel>
                    <FormControl>
                      <Autocomplete
                        onLoad={(auto) => setAutocomplete(auto)}
                        onPlaceChanged={() => {
                          if (autocomplete) {
                            const place = autocomplete.getPlace()
                            const formatted = place.formatted_address || ""
                            field.onChange(formatted)
                          }
                        }}
                      >
                        <Input
                          placeholder="Start typing address…"
                          {...field}
                          className="border-gray-300 focus:ring-[#4F55F7] focus:border-transparent"
                        />
                      </Autocomplete>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phoneNumber"
                rules={{ required: "Phone is required" }}
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-6">
                    <FormLabel className="text-[#161C54] font-medium mb-1">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
                        {...field}
                        className="border-gray-300 focus:ring-[#4F55F7] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business License */}
              <div className="space-y-2">
                <FormLabel className="text-[#161C54] font-medium">
                  Business License
                </FormLabel>
                <label className="group flex items-center justify-center w-full p-4 bg-white border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#2D4EA2] transition-colors">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <svg 
                        className="w-8 h-8 text-gray-400 group-hover:text-[#2D4EA2] transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 4v16m8-8H4" 
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">
                      {businessLicenseFile ? businessLicenseFile.name : "Upload business license"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) => e.target.files && setBusinessLicenseFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-[#2D4EA2] hover:bg-[#263F82] text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5"
                disabled={loading}
              >
                <span className="flex items-center justify-center">
                  {loading ? (
                    "Registering..."
                  ) : (
                    <>
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
                    </>
                  )}
                </span>
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  )
}
