import RegisterClient from "./RegisterClient";

export const metadata = {
  title: "Self Registration - PADEMCO Loan Monitoring System",
  description: "Register a new Loaner / Borrower account on the PADEMCO Airline Ticket Loan portal.",
};

export default async function RegisterPage() {
  return <RegisterClient />;
}
