import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {/* Placeholder: Your headline here */}
          Welcome to Your App
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {/* Placeholder: Your tagline/description here */}
          A brief description of what your app does and why users should care.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Button size="lg">
            {/* Placeholder: Primary CTA */}
            Get Started
          </Button>
          <Button variant="outline" size="lg">
            {/* Placeholder: Secondary CTA */}
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          {/* Placeholder: Features heading */}
          Features
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {/* Placeholder: Feature 1 title */}
                Feature One
              </CardTitle>
              <CardDescription>
                {/* Placeholder: Feature 1 description */}
                Description of your first key feature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder: Feature 1 content/details */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {/* Placeholder: Feature 2 title */}
                Feature Two
              </CardTitle>
              <CardDescription>
                {/* Placeholder: Feature 2 description */}
                Description of your second key feature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder: Feature 2 content/details */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {/* Placeholder: Feature 3 title */}
                Feature Three
              </CardTitle>
              <CardDescription>
                {/* Placeholder: Feature 3 description */}
                Description of your third key feature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder: Feature 3 content/details */}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">
          {/* Placeholder: CTA heading */}
          Ready to Get Started?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          {/* Placeholder: CTA description */}
          Join thousands of users who are already using our platform.
        </p>
        <Button size="lg">
          {/* Placeholder: CTA button */}
          Sign Up Now
        </Button>
      </section>
    </div>
  );
}
