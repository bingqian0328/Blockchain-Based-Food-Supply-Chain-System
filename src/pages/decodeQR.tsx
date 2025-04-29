import { useState } from "react"
import Navbar from "../components/navBar"
import jsQR from "jsqr"
import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Link as LinkIcon } from "lucide-react"

export default function DecodeQR() {
  const [qrData, setQrData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUrl, setIsUrl] = useState<boolean>(false)

  const form = useForm()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const img = new Image()
      img.src = reader.result as string

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0, img.width, img.height)

        const imageData = ctx?.getImageData(0, 0, img.width, img.height)
        if (imageData) {
          const code = jsQR(imageData.data, img.width, img.height)
          if (code) {
            setQrData(code.data)
            setError(null)
            if (isValidUrl(code.data)) {
              setIsUrl(true)
              window.open(code.data, "_blank")
            } else {
              setIsUrl(false)
            }
          } else {
            setQrData(null)
            setError("QR Code not detected. Please upload a valid image.")
          }
        }
      }
    }

    reader.onerror = () => {
      setError("Error reading the image file.")
    }
  }

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <Navbar />

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            QR Code <span className="text-[#2D4EA2]">Scanner</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Scan and track products in your supply chain
          </p>
        </section>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8 border-2 border-transparent hover:border-[#2D4EA2] transition-all duration-300">
            <Form {...form}>
              <FormField
                name="file"
                render={() => (
                  <FormItem className="mb-6">
                    <FormLabel className="text-[#161C54] font-medium">Upload QR Code Image</FormLabel>
                    <FormControl>
                      <label className="group flex flex-col items-center justify-center w-full p-8 bg-[#EEF2F6] border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#2D4EA2] transition-colors">
                        <div className="text-center">
                          <div className="flex justify-center mb-4">
                            <svg 
                              className="w-10 h-10 text-gray-400 group-hover:text-[#2D4EA2] transition-colors" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 16l4 4m0 0l4-4m-4 4V8m0 0l4 4m-4-4l-4 4m16-4l-4 4m0 0l-4-4m4 4V8m0 0l-4 4m4-4l4 4" 
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-600 group-hover:text-[#2D4EA2]">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: JPG, PNG, GIF
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            {qrData && (
              <Alert
                variant="default"
                className={`mt-6 border-2 ${
                  isUrl ? "border-[#2D4EA2] bg-[#EEF2F6]" : "border-green-500 bg-green-50"
                }`}
              >
                <div className="flex gap-3">
                  {isUrl ? (
                    <LinkIcon className="text-[#2D4EA2] h-5 w-5 mt-0.5" />
                  ) : (
                    <AlertCircle className="text-green-500 h-5 w-5 mt-0.5" />
                  )}
                  <div>
                    <AlertTitle className={`font-medium ${
                      isUrl ? "text-[#161C54]" : "text-green-800"
                    }`}>
                      QR Code Result
                    </AlertTitle>
                    <AlertDescription className="break-all text-sm mt-2">
                      {qrData}
                    </AlertDescription>
                    {isUrl && (
                      <a
                        href={qrData}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-3 text-sm font-medium text-[#2D4EA2] hover:text-[#263F82] transition-colors"
                      >
                        Open Link
                        <svg 
                          className="ml-1 w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mt-6 border-2 border-red-500 bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-medium">Upload Failed</AlertTitle>
                <AlertDescription className="mt-1">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
