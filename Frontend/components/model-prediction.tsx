"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { predictModel } from "@/lib/api";

// Define features for all models
const modelFeatures = {
  "RandomForest": [
    { name: "Academic Pressure", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Work/Study Hours", type: "slider", min: 0, max: 40, dataType: "float" },
    { name: "Financial Stress", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Dietary Habits", type: "select", options: ["Healthy", "Moderate", "Unhealthy"], dataType: "string" },
    { name: "Sleep Duration", type: "slider", min: 4, max: 10, dataType: "float" },
    { name: "Family History of Mental Illness", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "Have you ever had suicidal thoughts ?", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "CGPA", type: "slider", min: 2, max: 4, dataType: "float" },
    { name: "Gender", type: "select", options: ["Male", "Female", "Other"], dataType: "string" }
  ],
  "LogisticRegression": [
    { name: "Academic Pressure", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Work/Study Hours", type: "slider", min: 0, max: 40, dataType: "float" },
    { name: "Financial Stress", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Dietary Habits", type: "select", options: ["Healthy", "Moderate", "Unhealthy"], dataType: "string" },
    { name: "Sleep Duration", type: "slider", min: 4, max: 10, dataType: "float" },
    { name: "Family History of Mental Illness", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "Have you ever had suicidal thoughts ?", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "CGPA", type: "slider", min: 2, max: 4, dataType: "float" },
    { name: "Gender", type: "select", options: ["Male", "Female", "Other"], dataType: "string" }
  ],
  "XGBoost": [
    { name: "Academic Pressure", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Work/Study Hours", type: "slider", min: 0, max: 40, dataType: "float" },
    { name: "Financial Stress", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Dietary Habits", type: "select", options: ["Healthy", "Moderate", "Unhealthy"], dataType: "string" },
    { name: "Sleep Duration", type: "slider", min: 4, max: 10, dataType: "float" },
    { name: "Family History of Mental Illness", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "Have you ever had suicidal thoughts ?", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "CGPA", type: "slider", min: 2, max: 4, dataType: "float" },
    { name: "Gender", type: "select", options: ["Male", "Female", "Other"], dataType: "string" }
  ],
  "KNN": [
    { name: "Academic Pressure", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Work/Study Hours", type: "slider", min: 0, max: 40, dataType: "float" },
    { name: "Financial Stress", type: "slider", min: 0, max: 10, dataType: "float" },
    { name: "Dietary Habits", type: "select", options: ["Healthy", "Moderate", "Unhealthy"], dataType: "string" },
    { name: "Sleep Duration", type: "slider", min: 4, max: 10, dataType: "float" },
    { name: "Family History of Mental Illness", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "Have you ever had suicidal thoughts ?", type: "select", options: ["Yes", "No"], dataType: "int", apiValues: {"Yes": 1, "No": 0} },
    { name: "CGPA", type: "slider", min: 2, max: 4, dataType: "float" },
    { name: "Gender", type: "select", options: ["Male", "Female", "Other"], dataType: "string" }
  ]
};

export function ModelPrediction({ id }: { id: string }) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ probability: number; prediction: string } | null>(null);
  const { toast } = useToast();

  // Get features for the current model or default to empty array
  const features = modelFeatures[id as keyof typeof modelFeatures] || [];
  
  // Initialize form data with default values
  useEffect(() => {
    const initialData: Record<string, any> = {};
    features.forEach(feature => {
      if (feature.type === "slider") {
        initialData[feature.name] = feature.min;
      } else if (feature.type === "select" && feature.options && feature.options.length > 0) {
        initialData[feature.name] = feature.options[0];
      }
    });
    setFormData(initialData);
    
    // Reset result when model changes
    setResult(null);
  }, [id, features]);

  const handleInputChange = (name: string, value: any) => {
    console.log(`✏️ Input Changed: ${name} ->`, value);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Convert value to the appropriate type and validate
  const validateAndConvert = (value: any, feature: any): any => {
    if (value === null || value === undefined) {
      if (feature.type === "slider") return feature.min;
      if (feature.type === "select" && feature.options?.length > 0) {
        return feature.apiValues?.[feature.options[0]] ?? feature.options[0]; // return default string or mapped int
      }
      return 0;
    }
  
    // ✅ Only apply apiValues if feature explicitly uses integer data
    if (
      feature.apiValues &&
      typeof feature.apiValues === "object" &&
      feature.dataType !== "string"
    ) {
      console.log(feature.dataType);
      const mappedValue = feature.apiValues[value];
      if (mappedValue !== undefined) {
        return mappedValue;
      } else {
        console.warn(`No mapping for ${feature.name}: ${value}, using 0`);
        return 0;
      }
    }
  
    if (feature.dataType === "float") {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0.0 : numValue;
    }
  
    if (feature.dataType === "int") {
      const numValue = parseInt(value, 10);
      return isNaN(numValue) ? 0 : numValue;
    }
  
    // If string, return as-is
    return value;
  };
  

  const handlePredict = async () => {
    console.log("🔄 Predict button clicked!");

    // Ensure all required fields are filled
    const missingFields = features.filter(feature => formData[feature.name] === undefined);
    if (missingFields.length > 0) {
      console.log("⚠️ Missing Fields:", missingFields.map(f => f.name));
      toast({ 
        title: "Missing Information", 
        description: `Please fill in: ${missingFields.map(f => f.name).join(', ')}`, 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    // Simulate progress while API call is happening
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 10, 90);
        return newProgress;
      });
    }, 200);

    try {
      // Build a payload that exactly matches what the backend expects
      const apiPayload: Record<string, any> = {};
      
      // Process each feature with proper validation and conversion
      features.forEach(feature => {
        const value = validateAndConvert(formData[feature.name], feature);
        apiPayload[feature.name] = value;
      });
      
      console.log("📡 Sending API request with:", { model_id: id, features: apiPayload });
      console.log("Final API payload:", JSON.stringify(apiPayload));

      // Make the API call
      const prediction = await predictModel(id, apiPayload);
      console.log("✅ Prediction Response:", prediction);

      // Set result and complete progress
      setResult(prediction);
      setProgress(100);
      
      // Show success toast
      toast({ 
        title: "Prediction Complete", 
        description: `Result: ${prediction.prediction}`, 
      });
    } catch (error) {
      console.error("❌ Prediction Error:", error);
      toast({ 
        title: "Prediction Failed", 
        description: "An error occurred during prediction. Check console for details.", 
        variant: "destructive" 
      });
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Run Prediction with {id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.map((feature) => (
          <div key={feature.name} className="space-y-2">
            <Label htmlFor={feature.name}>{feature.name}</Label>

            {feature.type === "slider" && (
              <div className="space-y-2">
                <Slider
                  id={feature.name}
                  min={feature.min}
                  max={feature.max}
                  step={0.1}
                  value={[formData[feature.name] || feature.min]}
                  onValueChange={(value) => handleInputChange(feature.name, value[0])}
                />
                <div className="flex justify-between">
                  <span className="text-sm">{feature.min}</span>
                  <span className="text-sm font-medium">{formData[feature.name]?.toFixed(1) || feature.min}</span>
                  <span className="text-sm">{feature.max}</span>
                </div>
              </div>
            )}

            {feature.type === "select" && (
              <Select 
                value={formData[feature.name] || ""} 
                onValueChange={(value) => handleInputChange(feature.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${feature.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {feature.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        {isProcessing && <Progress value={progress} />}
        {result && !isProcessing && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium">Prediction Result</h4>
            <p className="text-lg">{(result.probability * 100).toFixed(1)}% Chance of Depression</p>
            <p className={`font-medium ${result.probability > 0.5 ? "text-red-500" : "text-green-500"}`}>
              {result.prediction}
            </p>
          </div>
        )}
      </CardContent>
      <div className="p-4">
        <Button className="w-full" onClick={handlePredict} disabled={isProcessing}>
          <Play className="h-4 w-4 mr-2" />
          {isProcessing ? "Processing..." : "Run Prediction"}
        </Button>
      </div>
    </Card>
  );
}