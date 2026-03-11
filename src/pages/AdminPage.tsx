import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Globe, CreditCard, BarChart3, Check, X, Search, Shield, Trash2 } from "lucide-react";

// Mock data
const mockUsers = [
  { id: "1", name: "John Doe", email: "john@example.com", plan: "Free", created_at: "2026-01-15" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", plan: "Premium", created_at: "2026-02-01" },
];
const mockPayments = [
  { id: "1", user: "John Doe", transactionId: "TXN789012", sender: "01712345678", status: "pending", date: "2026-03-10" },
];
const mockWebsites = [
  { id: "1", name: "TechFlow", user: "Jane Smith", created_at: "2026-02-15" },
];

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const stats = [
    { label: "Total Users", value: "2", icon: Users },
    { label: "Total Websites", value: "1", icon: Globe },
    { label: "Premium Users", value: "1", icon: CreditCard },
    { label: "Pending Payments", value: "1", icon: BarChart3 },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground mb-8">Manage users, websites, and payments.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl bg-card border border-border card-shadow"
          >
            <stat.icon className="h-6 w-6 mb-2 text-primary" />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="developer">Developer Info</TabsTrigger>
        </TabsList>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        <TabsContent value="users">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50"><th className="p-3 text-left font-medium">Name</th><th className="p-3 text-left font-medium">Email</th><th className="p-3 text-left font-medium">Plan</th><th className="p-3 text-left font-medium">Joined</th><th className="p-3 text-left font-medium">Actions</th></tr></thead>
              <tbody>
                {mockUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.plan === "Premium" ? "gradient-bg text-primary-foreground" : "bg-muted"}`}>{u.plan}</span></td>
                    <td className="p-3 text-muted-foreground">{u.created_at}</td>
                    <td className="p-3"><Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="websites">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50"><th className="p-3 text-left font-medium">Website</th><th className="p-3 text-left font-medium">User</th><th className="p-3 text-left font-medium">Created</th><th className="p-3 text-left font-medium">Actions</th></tr></thead>
              <tbody>
                {mockWebsites.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{w.name}</td>
                    <td className="p-3 text-muted-foreground">{w.user}</td>
                    <td className="p-3 text-muted-foreground">{w.created_at}</td>
                    <td className="p-3"><Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50"><th className="p-3 text-left font-medium">User</th><th className="p-3 text-left font-medium">TXN ID</th><th className="p-3 text-left font-medium">Sender</th><th className="p-3 text-left font-medium">Status</th><th className="p-3 text-left font-medium">Actions</th></tr></thead>
              <tbody>
                {mockPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{p.user}</td>
                    <td className="p-3 font-mono text-muted-foreground">{p.transactionId}</td>
                    <td className="p-3 text-muted-foreground">{p.sender}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">Pending</span></td>
                    <td className="p-3 flex gap-1">
                      <Button size="sm" variant="outline" className="text-accent"><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" className="text-destructive"><X className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="developer">
          <div className="max-w-lg p-6 rounded-2xl bg-card border border-border card-shadow space-y-4">
            <h2 className="font-display font-semibold text-lg">Edit Developer Info</h2>
            <div><label className="text-sm font-medium">Name</label><Input defaultValue="SiteForge Developer" /></div>
            <div><label className="text-sm font-medium">Bio</label><Input defaultValue="Full-stack developer passionate about AI" /></div>
            <div><label className="text-sm font-medium">Email</label><Input defaultValue="dev@siteforge.ai" /></div>
            <div><label className="text-sm font-medium">Website</label><Input defaultValue="https://siteforge.ai" /></div>
            <div><label className="text-sm font-medium">GitHub</label><Input placeholder="GitHub URL" /></div>
            <div><label className="text-sm font-medium">Twitter</label><Input placeholder="Twitter URL" /></div>
            <Button className="gradient-bg border-0 text-primary-foreground">Save Changes</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
