import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

type Error = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | Error>,
) {

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const body = req.body;

  res.status(200).json(body);
}
