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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white p-8 shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#161C54]">QR Code Scanner</h2>

          <Form {...form}>
          <FormField
                name="file"
                render={() => (
                    <FormItem className="mb-6">
                    <FormLabel className="text-[#161C54] block mb-2">Upload QR Code Image</FormLabel>
                    <FormControl>
                        <label
                        className="
                            flex items-center gap-2 px-4 py-2
                            bg-gray-50 text-gray-700
                            border border-gray-300 rounded-lg
                            cursor-pointer transition
                            hover:bg-gray-100
                            w-full
                        "
                        >
                        📁 Choose file…
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
              className={`mt-6 ${isUrl ? "border-blue-500" : "border-green-500"} bg-opacity-10`}
            >
              <div className="flex gap-2">
                {isUrl ? (
                  <LinkIcon className="text-blue-500 mt-1" />
                ) : (
                  <AlertCircle className="text-green-500 mt-1" />
                )}
                <div>
                  <AlertTitle className={isUrl ? "text-blue-800" : "text-green-800"}>
                    QR Code Result
                  </AlertTitle>
                  <AlertDescription className="break-all text-sm mt-1">{qrData}</AlertDescription>
                  {isUrl && (
                    <a
                      href={qrData}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm mt-2 inline-block"
                    >
                      Open Link
                    </a>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
