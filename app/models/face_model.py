from dataclasses import dataclass
from typing import List

import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image


@dataclass
class DetectedFace:
    embedding: torch.Tensor
    box: tuple[float, float, float, float]

class FaceModel:
    def __init__(self, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.mtcnn = MTCNN(image_size=160, margin=0, keep_all=True, device=self.device)
        self.resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self.device)

    def get_faces(self, image: Image.Image) -> List[DetectedFace]:
        cropped_faces, probs = self.mtcnn(image, return_prob=True)
        boxes, _ = self.mtcnn.detect(image)

        if cropped_faces is None:
            return []

        with torch.no_grad():
            embeddings = self.resnet(cropped_faces.to(self.device))

        results = []
        for embedding, box in zip(embeddings, boxes):
            results.append(DetectedFace(embedding=embedding, box=tuple(box)))
        return results



