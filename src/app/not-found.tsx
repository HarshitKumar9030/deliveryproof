import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Let’s get you back.</h1>
      <p>This page couldn’t be found.</p>
      <Link href="/" className="button primary">
        Your workspace
      </Link>
    </div>
  );
}
