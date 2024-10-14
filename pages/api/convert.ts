import { htmlToNodes } from "@/lib/convertService";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const body = req.body;
  const json = htmlToNodes(body);
  res.status(200).json(json);
}
