import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main className="pt-20">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: December 2024</p>
              </div>
              
              <Card>
                <CardContent className="p-8 prose prose-lg max-w-none">
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
                      <p>
                        By accessing and using Chatterbox services, you agree to be bound by these Terms of Service 
                        and all applicable laws and regulations. If you do not agree with any of these terms, 
                        you are prohibited from using or accessing our services.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Description of Service</h2>
                      <p>
                        Chatterbox provides educational games, communication support tools, progress tracking, 
                        and family management features designed specifically for children with special needs. 
                        Our platform helps families coordinate care and support their child's development journey.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Account Registration and Responsibilities</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Account Creation</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>You must be at least 18 years old to create an account</li>
                            <li>You must provide accurate and complete registration information</li>
                            <li>You are responsible for maintaining the security of your account credentials</li>
                            <li>You must notify us immediately of any unauthorized use of your account</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Parental Responsibility</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>You affirm that you are the parent or legal guardian of any child accounts you create</li>
                            <li>You consent to our collection and use of your child's information as described in our Privacy Policy</li>
                            <li>You are responsible for supervising your child's use of our services</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
                      <div className="space-y-4">
                        <p>You agree to use our services only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
                        
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Use the service for any unlawful purpose or in violation of any applicable laws</li>
                          <li>Share your account credentials with unauthorized parties</li>
                          <li>Attempt to gain unauthorized access to other users' accounts or our systems</li>
                          <li>Upload or transmit malicious code, viruses, or harmful content</li>
                          <li>Interfere with or disrupt the service or servers</li>
                          <li>Use automated systems to access the service without permission</li>
                          <li>Share, copy, or redistribute any content from the platform without authorization</li>
                        </ul>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Privacy and Data Protection</h2>
                      <p>
                        Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect 
                        your information. By using our services, you agree to the collection and use of information 
                        in accordance with our Privacy Policy.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Subscription and Payment Terms</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Billing</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Subscription fees are billed in advance on a recurring basis</li>
                            <li>All fees are non-refundable except as required by applicable law</li>
                            <li>We may change our pricing with 30 days' notice to existing subscribers</li>
                            <li>Failed payments may result in service suspension</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Cancellation</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>You may cancel your subscription at any time from your account settings</li>
                            <li>Cancellation will take effect at the end of your current billing period</li>
                            <li>You will continue to have access to paid features until the end of your billing period</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Intellectual Property Rights</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Our Content</h3>
                          <p>
                            All content, features, and functionality on our platform are owned by Chatterbox and are 
                            protected by copyright, trademark, and other intellectual property laws.
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Your Content</h3>
                          <p>
                            You retain ownership of any content you upload or create using our services. However, 
                            you grant us a license to use, store, and process this content to provide our services.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Service Availability</h2>
                      <p>
                        We strive to provide reliable service, but we do not guarantee that our services will be 
                        uninterrupted or error-free. We may temporarily suspend service for maintenance, updates, 
                        or due to circumstances beyond our control.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Disclaimers and Limitation of Liability</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Educational Tool</h3>
                          <p>
                            Our services are educational tools designed to supplement, not replace, professional 
                            medical, therapeutic, or educational advice. Always consult with qualified professionals 
                            regarding your child's development and needs.
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Limitation of Liability</h3>
                          <p>
                            To the fullest extent permitted by law, Chatterbox shall not be liable for any indirect, 
                            incidental, special, or consequential damages arising from your use of our services.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Account Termination</h2>
                      <p>
                        We reserve the right to terminate or suspend accounts that violate these Terms of Service. 
                        Upon termination, your right to use the service will cease immediately, and we may delete 
                        your account and data in accordance with our Privacy Policy.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
                      <p>
                        We may update these Terms of Service from time to time. We will notify you of any significant 
                        changes by email and by posting the updated terms on our website. Your continued use of our 
                        services after any changes indicates your acceptance of the updated terms.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
                      <p>
                        These Terms of Service are governed by and construed in accordance with the laws of [State/Country], 
                        without regard to its conflict of law provisions.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
                      <p>
                        If you have any questions about these Terms of Service, please contact us at:
                      </p>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p><strong>Legal Team</strong><br />
                        Email: legal@chatterbox.app<br />
                        Phone: 1-800-CHATTER<br />
                        Address: [Company Address]</p>
                      </div>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}