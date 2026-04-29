import DbConnectionHelpCard from "@/components/DbConnectionHelpCard";

/**
 * PostgreSQL’e bağlanılamıyorsa veya sorgu başarısızsa ana sayfa yerine gösterilir.
 */
export default function DbConnectionRequired() {
  return <DbConnectionHelpCard />;
}
