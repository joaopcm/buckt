"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  orgName: z.string().min(1, "Organization name is required"),
})

type SignupValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupValues) {
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error(error.message ?? "Failed to create account")
      return
    }

    const slug = values.orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    const { error: orgError } = await authClient.organization.create({
      name: values.orgName,
      slug,
    })

    if (orgError) {
      toast.error(orgError.message ?? "Failed to create organization")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Get started with branded S3 buckets in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            type="text"
            placeholder="Acme Corp"
            {...register("orgName")}
          />
          {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
