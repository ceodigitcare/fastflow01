import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Code } from "lucide-react";
import { createChatUrl } from "@/lib/utils";

interface ChatbotEmbedProps {
  businessId: number;
}

export default function ChatbotEmbed({ businessId }: ChatbotEmbedProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [widgetColor, setWidgetColor] = useState("#0052CC");
  const [position, setPosition] = useState("right");
  
  const chatUrl = createChatUrl(businessId);
  
  // Generate iframe code
  const iframeCode = `<iframe
  src="${chatUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>`;

  // Generate script code
  const scriptCode = `<script>
  (function() {
    var chatButton = document.createElement('div');
    chatButton.innerHTML = '💬';
    chatButton.style.position = 'fixed';
    chatButton.style.bottom = '20px';
    chatButton.style.${position === 'right' ? 'right' : 'left'} = '20px';
    chatButton.style.zIndex = '9999';
    chatButton.style.width = '60px';
    chatButton.style.height = '60px';
    chatButton.style.borderRadius = '50%';
    chatButton.style.backgroundColor = '${widgetColor}';
    chatButton.style.color = 'white';
    chatButton.style.fontSize = '30px';
    chatButton.style.display = 'flex';
    chatButton.style.alignItems = 'center';
    chatButton.style.justifyContent = 'center';
    chatButton.style.cursor = 'pointer';
    chatButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    
    var chatWindow = null;
    
    chatButton.addEventListener('click', function() {
      if (chatWindow && !chatWindow.closed) {
        chatWindow.focus();
      } else {
        chatWindow = window.open('${chatUrl}', 'StoreFrontChat', 'width=400,height=600');
      }
    });
    
    document.body.appendChild(chatButton);
  })();
</script>`;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The embed code has been copied to your clipboard.",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="mr-2 h-5 w-5" />
            Embed Your Chatbot
          </CardTitle>
          <CardDescription>
            Choose how to integrate your AI chatbot into your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customization</h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium w-24">Widget Color:</label>
                <div className="flex items-center">
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-10 h-10 rounded border"
                  />
                  <Input
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-32 ml-2"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium w-24">Position:</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={position === 'right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPosition('right')}
                  >
                    Bottom Right
                  </Button>
                  <Button
                    variant={position === 'left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPosition('left')}
                  >
                    Bottom Left
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Option 1: Embed as an iFrame</h3>
            <div className="relative">
              <Textarea 
                className="font-mono text-sm h-32"
                readOnly
                value={iframeCode}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopyCode(iframeCode)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Option 2: Add Chat Widget Button</h3>
            <div className="relative">
              <Textarea 
                className="font-mono text-sm h-56"
                readOnly
                value={scriptCode}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopyCode(scriptCode)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Copy and paste the code above into your website's HTML to integrate the chatbot.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}