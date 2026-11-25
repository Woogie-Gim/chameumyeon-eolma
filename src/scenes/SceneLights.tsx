// 3D 공용 조명. 세 장면이 같은 종류와 개수의 조명(환경광 1 + 주광 1)을 써서 셰이더 구성을 같게 유지한다
// 조명을 늘리면 셰이더가 커져 저사양과 소프트웨어 렌더러에서 컴파일이 느려지므로 세기와 위치만 장면별로 바꾼다
type Props = { ambient: number; main: number; position?: [number, number, number] }

export function SceneLights({ ambient, main, position = [3, 5, 4] }: Props) {
  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight position={position} intensity={main} />
    </>
  )
}
