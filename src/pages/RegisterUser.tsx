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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />

      <div className="flex-1 flex justify-center items-start pt-24 px-4">
        <div className="w-full max-w-md mx-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="
                bg-white
                p-8
                rounded-2xl
                shadow-xl
                border border-gray-200
                space-y-6
              "
            >
              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-[#161C54] mb-6">
                Register as a User
              </h2>

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                rules={{ required: "Please select a role" }}
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-4">
                    <FormLabel className="text-[#161C54] font-medium mb-1">
                      Select Role
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F55F7] transition">
                          <SelectValue placeholder="Select role" />
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
                    <FormMessage />
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
              <div className="mb-6">
                <FormLabel className="text-[#161C54] font-medium mb-1">
                  Proof of Business License
                </FormLabel>
                <label
                  className="
                    flex items-center
                    space-x-3
                    px-4 py-2
                    bg-gray-50
                    border border-gray-300
                    rounded-lg
                    cursor-pointer
                    hover:bg-gray-100
                    transition
                  "
                >
                  <span className="text-gray-500">📁</span>
                  <span className="text-gray-600">
                    {businessLicenseFile ? businessLicenseFile.name : "Choose file…"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) =>
                      e.target.files && setBusinessLicenseFile(e.target.files[0])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="
                  w-full
                  bg-[#161C54] hover:bg-[#2a3171]
                  text-white
                  py-3
                  rounded-lg
                  font-semibold
                  tracking-wide
                  shadow-lg
                  transform hover:-translate-y-0.5
                  transition
                "
                disabled={loading}
              >
                {loading ? "Registering…" : "Register"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
