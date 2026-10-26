import { useId, useState } from "react";

// Campo de configuração que o navegador não deve preencher sozinho com o
// login salvo (e-mail/senha do admin). Não usa type="password" — assim o
// Chrome não trata como formulário de login — e só fica editável depois do
// clique, quando o preenchimento automático já passou. Com `secret`, o texto
// aparece como bolinhas.
export default function NoAutofillInput({ secret = false, style, ...props }) {
  const id = useId();
  const [editable, setEditable] = useState(false);
  return (
    <input
      type="text"
      name={`campo-${id}`}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      readOnly={!editable}
      onFocus={() => setEditable(true)}
      style={secret ? { WebkitTextSecurity: "disc", ...style } : style}
      {...props}
    />
  );
}
