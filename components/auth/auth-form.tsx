"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Mode = "login" | "signup";

const schemas = {
  login: Yup.object({
    email: Yup.string().email("Enter a valid email address").required("Email is required"),
    password: Yup.string().required("Password is required"),
  }),
  signup: Yup.object({
    fullName: Yup.string().min(2, "Enter your full name").required("Name is required"),
    email: Yup.string().email("Enter a valid email address").required("Email is required"),
    password: Yup.string().min(8, "Use at least 8 characters").required("Password is required"),
  }),
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const formik = useFormik({
    initialValues: { fullName: "", email: "", password: "" },
    validationSchema: schemas[mode],
    onSubmit: async (values) => {
      const supabase = createClient();
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) return void toast.error(error.message);
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.fullName } },
      });
      if (error) return void toast.error(error.message);
      if (!data.session) {
        toast.success("Check your email to confirm your account, then sign in.");
        router.replace("/login");
        return;
      }
      toast.success("Account created.");
      router.replace("/onboarding");
      router.refresh();
    },
  });

  const err = (k: "fullName" | "email" | "password") =>
    formik.touched[k] ? formik.errors[k] : undefined;

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
      {!isLogin && (
        <Field label="Full name" htmlFor="fullName" error={err("fullName")}>
          <Input id="fullName" autoComplete="name" {...formik.getFieldProps("fullName")} />
        </Field>
      )}
      <Field label="Email" htmlFor="email" error={err("email")}>
        <Input id="email" type="email" autoComplete="email" {...formik.getFieldProps("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={err("password")}>
        <Input
          id="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          {...formik.getFieldProps("password")}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-muted">
        {isLogin ? "New to FlowVoice? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-foreground underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
