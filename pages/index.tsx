export default function Home() {
  return (
    <>
      <pre>POST your html in body to /api/convert</pre>
      <p>Example:</p>
      <pre>
        curl --request POST \ --url http://localhost:3000/api/convert \ --header 'Content-Type: text/plain' \ --header
        'User-Agent: insomnia/10.0.0' \ --data '
        <p dir="ltr">
          Built for web producers, marketers and merchandisers, Uniform unleashes the potential of teams and technology,
          integrating content and data systems with optimization and personalization tools to centralize experience
          creation inside <a href="/what-is-visual-workspace">a visual workspace</a>.
        </p>
        '
      </pre>
    </>
  );
}
