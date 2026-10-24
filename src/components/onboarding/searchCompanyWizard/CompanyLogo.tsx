import React from "react";
import { Building2 } from "lucide-react";
import type { GoogleSearchResult } from "./api/google";

interface CompanyLogoProps {
  result: GoogleSearchResult;
}

export function CompanyLogo({ result }: CompanyLogoProps) {
  const [idx, setIdx] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  const sources = React.useMemo(() => {
    const list: string[] = [];
    if (result.link) {
      try {
        const host = new URL(result.link).hostname.replace(/^www\./i, "");
        list.push(`https://logo.clearbit.com/${host}`);
        list.push(`https://www.google.com/s2/favicons?domain=${host}&sz=128`);
      } catch {
        // Ignore invalid URL
      }
    }
    return list;
  }, [result]);

  const onError = () => {
    if (idx < sources.length - 1) setIdx((v) => v + 1);
    else setFailed(true);
  };

  if (failed || sources.length === 0) {
    return (
      <div className="h-12 w-12 rounded-xl bg-harx-50 text-harx-500 flex items-center justify-center">
        <Building2 size={20} />
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt={`${result.title} logo`}
      className="h-12 w-12 rounded-xl object-contain border border-gray-100 bg-white"
      onError={onError}
    />
  );
}
