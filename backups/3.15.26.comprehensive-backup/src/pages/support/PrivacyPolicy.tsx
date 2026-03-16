import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main className="pt-20">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: December 2024</p>
              </div>
              
              <Card>
                <CardContent className="p-8 prose prose-lg max-w-none">
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-bold mb-4">Our Commitment to Privacy</h2>
                      <p>
                        At Chatterbox, we understand that your child's information is incredibly sensitive and important. 
                        We are committed to protecting your family's privacy and ensuring that your data is secure, 
                        private, and used only to benefit your child's development.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Account Information</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Parent/guardian contact information (name, email, phone)</li>
                            <li>Child profile information (name, age, developmental preferences)</li>
                            <li>Family member and caregiver information (when invited to participate)</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Usage Data</h3>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Activity and progress data from games and exercises</li>
                            <li>Communication interactions and preferences</li>
                            <li>Time spent on activities and engagement patterns</li>
                            <li>Device and technical information for app functionality</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Provide personalized learning experiences for your child</li>
                        <li>Track progress and generate developmental reports</li>
                        <li>Communicate with your family and support team</li>
                        <li>Improve our services and develop new features</li>
                        <li>Ensure platform security and prevent misuse</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">COPPA Compliance</h2>
                      <p>
                        We are fully compliant with the Children's Online Privacy Protection Act (COPPA). 
                        We do not knowingly collect personal information from children under 13 without 
                        verifiable parental consent. Parents have full control over their child's information 
                        and can review, modify, or delete it at any time.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Information Sharing</h2>
                      <div className="space-y-4">
                        <p><strong>We do NOT sell or share your child's personal information with third parties for marketing purposes.</strong></p>
                        
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Limited Sharing</h3>
                          <p>We may share information only in these specific circumstances:</p>
                          <ul className="list-disc pl-6 space-y-1 mt-2">
                            <li>With family members and professionals you explicitly invite to your child's support team</li>
                            <li>With service providers who help us operate the platform (all bound by strict confidentiality agreements)</li>
                            <li>When required by law or to protect safety</li>
                            <li>In anonymized, aggregated form for research purposes (no individual identification possible)</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>All data is encrypted in transit and at rest using industry-standard protocols</li>
                        <li>Access is strictly controlled and monitored</li>
                        <li>Regular security audits and penetration testing</li>
                        <li>Secure data centers with physical and digital protections</li>
                        <li>Staff training on privacy and security best practices</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Your Rights and Controls</h2>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Access:</strong> View all information we have about your child</li>
                        <li><strong>Correction:</strong> Update or correct any information</li>
                        <li><strong>Deletion:</strong> Request deletion of your child's account and data</li>
                        <li><strong>Portability:</strong> Export your child's data in a standard format</li>
                        <li><strong>Control:</strong> Manage who has access to your child's information</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
                      <p>
                        We retain your child's information only as long as necessary to provide our services 
                        or as required by law. When you delete your account, we will permanently delete your 
                        child's personal information within 30 days, except where we are required to retain 
                        certain information for legal or safety reasons.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">International Users</h2>
                      <p>
                        If you are located outside the United States, please note that your information 
                        will be transferred to and processed in the United States. We ensure appropriate 
                        safeguards are in place to protect your information in accordance with this Privacy Policy.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Updates to This Policy</h2>
                      <p>
                        We may update this Privacy Policy from time to time. We will notify you of any 
                        significant changes by email and by posting the updated policy on our website. 
                        Your continued use of our services after any changes indicates your acceptance of the updated policy.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                      <p>
                        If you have any questions about this Privacy Policy or our privacy practices, 
                        please contact us at:
                      </p>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p><strong>Privacy Team</strong><br />
                        Email: privacy@chatterbox.app<br />
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